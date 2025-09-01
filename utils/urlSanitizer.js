"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUrlForFirestore = sanitizeUrlForFirestore;
exports.unsanitizeUrlFromFirestore = unsanitizeUrlFromFirestore;
exports.createPageDocRef = createPageDocRef;
exports.getOriginalUrlFromPageDoc = getOriginalUrlFromPageDoc;
exports.testUrlSanitization = testUrlSanitization;
exports.migratePagesWithInvalidIds = migratePagesWithInvalidIds;
// utils/urlSanitizer.ts - Fix for Firestore document ID issues
/** Sanitizes URLs to be safe for use as Firestore document IDs
Firestore document IDs cannot contain forward slashes (/) or other special characters */
function sanitizeUrlForFirestore(url) {
    if (!url)
        return '';
    return url
        // Remove protocol
        .replace(/^https?:\/\//, '')
        // Replace forward slashes with double underscore
        .replace(/\//g, '__')
        // Replace other problematic characters
        .replace(/[#?&=]/g, '_')
        // Remove double slashes that might remain
        .replace(/_{3,}/g, '__')
        // Trim any leading/trailing underscores
        .replace(/^_+|_+$/g, '');
}
/**
 * Converts a sanitized document ID back to a URL
 * For display purposes and external linking
 */
function unsanitizeUrlFromFirestore(sanitizedUrl, protocol = 'https') {
    if (!sanitizedUrl)
        return '';
    const url = sanitizedUrl
        // Convert double underscores back to forward slashes
        .replace(/__/g, '/')
        // Handle single underscores (convert back to appropriate characters if needed)
        .replace(/_/g, '');
    // Add protocol back
    return `${protocol}://${url}`;
}
/**
 * Creates a safe document reference for pages collection
 */
function createPageDocRef(firestore, url) {
    const sanitizedUrl = sanitizeUrlForFirestore(url);
    return firestore.collection('pages').doc(sanitizedUrl);
}
/**
 * Gets the original URL from a page document
 */
function getOriginalUrlFromPageDoc(pageDoc) {
    // First try to get from the document data if it's stored there
    const data = pageDoc.data();
    if (data?.originalUrl) {
        return data.originalUrl;
    }
    // Otherwise, unsanitize from document ID
    return unsanitizeUrlFromFirestore(pageDoc.id);
}
// Example usage and test function
function testUrlSanitization() {
    const testUrls = [
        'https://example.com/path/to/page',
        'https://example.com/blog/post-title/',
        'https://example.com/search?q=test&category=blog',
        'https://example.com/path//with//double//slashes',
        'https://example.com/path/with-hashes#section',
    ];
    console.log('URL Sanitization Tests:');
    testUrls.forEach(url => {
        const sanitized = sanitizeUrlForFirestore(url);
        const restored = unsanitizeUrlFromFirestore(sanitized);
        console.log(`Original: ${url}`);
        console.log(`Sanitized: ${sanitized}`);
        console.log(`Restored: ${restored}`);
        console.log('---');
    });
}
/**
 * Migration utility to fix existing documents with invalid IDs
 */
async function migratePagesWithInvalidIds(firestore) {
    console.log('🔧 Starting migration of pages with invalid document IDs...');
    try {
        // Get all pages (this might fail if some have invalid IDs)
        const pagesSnapshot = await firestore.collection('pages').get();
        const batch = firestore.batch();
        const invalidDocs = [];
        for (const doc of pagesSnapshot.docs) {
            const docId = doc.id;
            const data = doc.data();
            // Check if document ID contains problematic characters
            if (docId.includes('/') || docId.includes('//')) {
                invalidDocs.push({ doc, data });
            }
        }
        console.log(`Found ${invalidDocs.length} documents with invalid IDs`);
        // Create new documents with sanitized IDs and delete old ones
        for (const { doc, data } of invalidDocs) {
            const originalUrl = data.url || doc.id;
            const sanitizedId = sanitizeUrlForFirestore(originalUrl);
            // Add originalUrl to data if not present
            const newData = {
                ...data,
                originalUrl: originalUrl,
                url: originalUrl, // Keep the original URL in the data
                migratedAt: new Date().toISOString()
            };
            // Create new document with sanitized ID
            const newDocRef = firestore.collection('pages').doc(sanitizedId);
            batch.set(newDocRef, newData);
            // Delete old document
            batch.delete(doc.ref);
            console.log(`Migrating: ${doc.id} -> ${sanitizedId}`);
        }
        if (invalidDocs.length > 0) {
            await batch.commit();
            console.log('✅ Migration completed successfully!');
        }
        else {
            console.log('✅ No invalid document IDs found');
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
