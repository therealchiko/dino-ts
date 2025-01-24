import { FeedWorker } from './workers/FeedWorker';

FeedWorker.start()
  .catch(error => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });