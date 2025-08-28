export function trendAnalysis(data: number[]): { m: number; b: number; rSquared: number; trend: 'up' | 'down' | 'stable' } {
  const n = data.length;
  if (n < 2) return { m: 0, b: n === 1 ? data[0] : 0, rSquared: 1, trend: 'stable' };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const b = (sumY - m * sumX) / n;
  const yMean = sumY / n;

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = m * i + b;
    ssTot += Math.pow(data[i] - yMean, 2);
    ssRes += Math.pow(data[i] - yPred, 2);
  }

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot));

  const historicalAvg = sumY / n;
  const relativeThreshold = historicalAvg * 0.001;
  const trend = m > relativeThreshold ? 'up' : m < -relativeThreshold ? 'down' : 'stable';

  return { m, b, rSquared, trend };
}
