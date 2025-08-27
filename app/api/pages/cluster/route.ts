import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { EmbeddingService } from '@/services/ai-companion/EmbeddingService';
import { ClusteringService } from '@/services/clustering/ClusteringService';

export const dynamic = 'force-dynamic';

interface PageDocumentData {
  id: string;
  pageTitle: string;
  pageContent: string;
  topQueries: string[];
}

export async function GET(request: NextRequest) {
  // 1. Authenticate the cron job request
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret.' }, { status: 401 });
  }

  try {
    const firestore = initializeFirebaseAdmin();
    const embeddingService = new EmbeddingService();
    const clusteringService = new ClusteringService();

    // 2. Fetch all pages from Firestore
    const pagesSnapshot = await firestore.collection('pages').get();
    if (pagesSnapshot.empty) {
      return NextResponse.json({ message: 'No pages found to cluster.' });
    }

    const pages: PageDocumentData[] = pagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PageDocumentData));

    // 3. Generate embeddings for each page
    const embeddings: number[][] = [];
    for (const page of pages) {
      const embedding = await embeddingService.generatePageEmbedding(page);
      embeddings.push(embedding);
    }

    // 4. Cluster the embeddings
    const clusterAssignments = clusteringService.clusterEmbeddings(embeddings);

    // 5. Batch-update Firestore with the cluster IDs
    const batch = firestore.batch();
    pages.forEach((page, index) => {
      const pageRef = firestore.collection('pages').doc(page.id);
      const clusterId = `cluster_${clusterAssignments[index]}`;
      batch.update(pageRef, { cluster_id: clusterId });
    });

    await batch.commit();

    const numberOfClusters = new Set(clusterAssignments).size;

    return NextResponse.json({
      status: 'success',
      message: 'Page clustering completed successfully.',
      pagesProcessed: pages.length,
      clustersCreated: numberOfClusters,
    });

  } catch (error) {
    console.error('[Cron Job] Page clustering failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Page clustering failed.',
      details: errorMessage,
    }, { status: 500 });
  }
}
