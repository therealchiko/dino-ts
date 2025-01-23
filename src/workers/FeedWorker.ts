import axios from 'axios';
import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { EventProcessor } from '../services/EventProcessor';
import { FeedEvent } from '../types/events';

export class FeedWorker {
  private static lastProcessedTime: Date | null = null;
  private static readonly FEED_URL = 'https://dinoparks.herokuapp.com/nudls/feed';
  private static eventProcessor: EventProcessor;

  static async start() {
    const dataSource = await AppDataSource.initialize();
    this.eventProcessor = new EventProcessor(dataSource);
    
    // Run every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.pollFeed();
      } catch (error) {
        console.error('Error polling feed:', error);
      }
    });
  }

  private static async pollFeed() {
    const response = await axios.get<FeedEvent[]>(this.FEED_URL);
    const events = response.data;

    if (!events.length) return;

    // Sort events by time
    const sortedEvents = events.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    // Process only new events
    const newEvents = this.lastProcessedTime 
      ? sortedEvents.filter(event => 
          new Date(event.time) > this.lastProcessedTime!
        )
      : sortedEvents;

    if (newEvents.length) {
      await this.processEvents(newEvents);
      this.lastProcessedTime = new Date(sortedEvents[0].time);
    }
  }

  private static async processEvents(events: FeedEvent[]) {
    for (const event of events) {
      try {
        await this.eventProcessor.processEvent(event);
        console.log(`Processed event: ${event.kind} at ${event.time}`);
      } catch (error) {
        // we need to log errors differently
        console.error(`Error processing event ${event.kind}:`, error);
      }
    }
  }
}