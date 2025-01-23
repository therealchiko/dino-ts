import { FeedWorker } from './FeedWorker';

async function startWorkers() {
  await FeedWorker.start();
}

startWorkers().catch(console.error);