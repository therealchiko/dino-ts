import axios from 'axios';
import cron from 'node-cron';
import { parseISO } from 'date-fns';
import { AppDataSource } from '../config/database';
import { EventProcessor } from '../services/EventProcessor';
import { FeedEvent } from '../types/events';
import { EventLog } from '../models/EventLog';

export class FeedWorker {
  private static readonly FEED_URL = 'https://dinoparks.herokuapp.com/nudls/feed';
  private static eventProcessor: EventProcessor;
  private static eventLogRepository = AppDataSource.getRepository(EventLog);

  static async start() {
    const dataSource = await AppDataSource.initialize();
    this.eventProcessor = new EventProcessor(dataSource);
    await this.pollFeed();
    
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

    // save events that are new for processing later.
    const newEvents: EventLog[] = [];

    // Log all events first. ensure no duplicates via the unique constraint on the event_log table
    try {
      await Promise.all(events.map(event => {
        const logEvent = {
          kind: event.kind,
          dinosaur_id: 'dinosaur_id' in event ? event.dinosaur_id : null,
          park_id: event.park_id,
          time: parseISO(event.time),
          location: 'location' in event ? event.location : null,
          name: 'name' in event ? event.name : null,
          species: 'species' in event ? event.species : null,
          gender: 'gender' in event ? event.gender : null,
          digestion_period_in_hours: 'digestion_period_in_hours' in event ? event.digestion_period_in_hours : null,
          herbivore: 'herbivore' in event ? event.herbivore : null,
          raw_event: event
        } as EventLog;
        this.eventLogRepository.save(logEvent);
        newEvents.push(logEvent);
        })
      );
    } catch (error: any) {
      if (error.code === '23505') { // postgress error for duplicate https://www.metisdata.io/knowledgebase/errors/postgresql-23505
        console.log('Duplicate event detected. Skipping save.');
      } else {
        console.error('An unexpected error occurred:', error);
        throw error;
      }
    }

    // Ensures dino_added events are processed first
    // this half-solves the problem of removing dinosaurs that have not been added first
    const sortedEvents = newEvents.sort((a, b) => {
      if (a.kind === 'dino_added' && b.kind !== 'dino_added') return -1;
      if (b.kind === 'dino_added' && a.kind !== 'dino_added') return 1;
      return 0;
    });

    await this.processEvents(sortedEvents);
  }

  private static async processEvents(events: EventLog[]) {
    for (const event of events) {
      try {
          await this.eventProcessor.processEvent(event);
          console.log(`Processed event: ${event.kind} at ${event.time}`);
      } catch (error) {
        console.error(`Error processing event ${event.kind} at ${event.time}:`, {
          error: (error as any).message ?? 'Unknown error',
          event: {
            kind: event.kind,
            id: 'dinosaur_id' in event ? event.dinosaur_id : undefined,
            location: 'location' in event ? event.location : undefined,
            time: event.time
          }
        });
      }
    }
  }
}