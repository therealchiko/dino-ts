# Dinopark

A Node.js/TypeScript API for maintenance and zone overview of Dinopark.

## How I approached the problem

### Technical Stack and choices

I selected TypeScript with Node.js for this implementation as required. I love types and the speed of something lightweight like Express. PostgreSQL serves as our database, chosen for its reliability and JSONB support which proved perfect for event logging.

The core architecture revolves around an event processing system that manages real-time park updates. I designed the entity relationships carefully to maintain data (and referential) integrity while enabling flexible querying patterns. This is why I picked a SQL and not NoSQL. 

### Event-driven Architecture

The system processes events from the NUDLS feed using a dedicated EventProcessor service that handles:

- Dinosaur additions and removals
- Location updates
- Feeding events
- Maintenance records

Each event is processed within a transaction to ensure data consistency. The system maintains computed properties that are automatically updated:

- Zone maintenance status
- Dinosaur digestion status
- Zone safety status

### Data Model

The system uses four main entities:
- Zone: Represents areas in the park
- Dinosaur: Tracks dinosaur status and location
- Maintenance: Records maintenance history
- EventLog: Stores all incoming events

### Caching

I created a lightweight caching system to keep requests for the most heavy endpoint `/park/status` in memory. This is done to ensure that the system doesn't have to query the database every time the endpoint is called. 

I invalidate this cache whenever a new event is processed. This is done to ensure that the system always has the most up-to-date data.

### Worker

I created a worker process that polls the endpoints for new events away from the main thread. 

### Challenges and problems I faced

The data is not supplied in chronological order. That stumped me until I came up with a way to store all data on an events log, then consume just the new entities sent through. To do that, I changed how the `updated_at` column conventionally works, choosing to use it to keep the time when the last event was sent so that the system updated just the new entries irregardless of when it was sent. (in a biggger app, that's where queues won't come in handy).

## Setup and Running

1. Clone the repository
2. Install dependencies (npm i)
3. Set up your environment variables in a .env file (see .env.example). Ensure you have a postresql database running.
4. Inside package.json, we have a few commands to be run in the following sequence:
  - Migrations: `npm run migration:run` - sets up the database 
  - Seeding: `npm run seed` - populates the database with initial data about the virtual grid
  **IF* you decide to go for a fresh start, run the following commands:**
    `npm run migration:refresh && npm run seed`
5. Testing.
  - We have tests residing in __tests__ folder and categorized by type. For test to run, you need to create their own database, and create an env file called `.env.test`. This ensures test data is handled away from development / production data in this case.
  - To run tests: `npm run test`
6. Running the app
  - Because the app uses two processes (the API and the worker), we use PM2 for process management
  - For development: `npm run start:dev` (includes file watching)
  - To minotor activity: `npx pm2 monit`
  - To stop all processes: `npm run stop`
7. Support:
  - If you encounter problems setting this up and having it run, I offer incredible support: dev@chikomukwenha.co and I'll hop on a call to get you up and running!

## API Design

It's very minimal. All endpoints return JSON responses and include appropriate error handling for invalid requests.

### GET api/park/status
Returns a comprehensive overview of the park, including:
- Zone details with current occupants
- Maintenance requirements
- Safety status for each zone

### GET /zones
Produces an array of zones, sorted by last_perfomed_at:

  - `id`: Unique identifier for the zone
  - `code`: Zone code (e.g., "H11", "B7")
  - `park_id`: Park identifier
  - `last_maintenance`: Timestamp of last maintenance (null if never maintained)
  - `occupant`: Details of the current Dinosaur occupant (if any)
  - `daysSinceLastMaintenance`: Days since last maintenance (null if never maintained)
  - `requiresMaintenance`: Boolean indicating maintenance needs
  - `maintenance_history`: Historical maintenance records ["not implemented"]

### GET /zones/:code
  (:code is case sensitive)
  Returns detailed information about a specific zone. The response includes:

  - `id`: Zone's unique identifier
  - `code`: Zone's location code (e.g., "H11")
  - `park_id`: Associated park ID
  - `last_maintenance`: Timestamp of most recent maintenance
  - `occupant`: Details of the current Dinosaur occupant (if any)
  - `daysSinceLastMaintenance`: Number of days since last maintenance
  - `requiresMaintenance`: Boolean flag for maintenance needs
  - `maintenance_history`: Array of historical maintenance records, each containing:
    - `id`: Maintenance record ID
    - `location`: Zone code
    - `park_id`: Park identifier
    - `performed_at`: Timestamp of maintenance

### GET /dinosaurs
An array of all the dinosaurs we have on the system

### GET /dinosaurs/:dinosaur_id
Gives data about a specific dinosaur

## What I would do differently

1. **Queue System**
   - Implement a proper message queue (like RabbitMQ or Redis) for event processing
   - This would handle out-of-order events better than our current solution
   - Better scalability for multiple workers

2. **API Documentation**
   - Include request/response examples
   - Better error documentation

3. **Monitoring & Logging**
   - Set up proper error tracking (e.g., Sentry)

5. **Safety Features**
   - Implement rate limiting for the API
   - Add request validation middleware
   - Implement proper authentication/authorization

6. **Performance Optimizations**
   - Add database indexing strategy
   - Implement more sophisticated caching
   - Add database connection pooling

7. **Developer Experience**
   - Add better development tooling (ESLint, Prettier)
   - Implement CI/CD pipeline
   - Add better documentation for local development

## What I learned

Time is important! Both in terms of handling the feed data, and also the time to spec out everything and find out where the nuances are. 

I learnt that most dinosaurs try to get out of the virtual grid. I didn't allow them to though, so data that came with invalid zones I didn't process it. (was this by design?)

## How to improve this challenge

1. Add the challenge for the api to be consumed by an actual frontend, and have a full stack person implement both. Should have time travel ability.
2. Make it so that data can come from multiple sources.

## Answes to questions

#### 1. Making it more resilient and fault-tolerant.

##### Database

- Make sure the database has multiple replicas, so that if one goes down, the other can take over. Additionally, have read replicas to separate reads and writes.
- Add more indexes to speed up queries.
- Add database health checks
- Set up monitoring for queries

##### Application

- Set it up for auto scaling, and have a load balancer in front of it.
- Add a queue system to handle the events from the NUDLS feed.
- Add a monitoring system to monitor the application and the database, get alerts and metrics for health checks.
- Add a CI/CD pipeline to deploy the application and make sure tests always pass and run before deployment.

#### 2. What will break with heavier loads?

The database would struggle with:
- Large scale real time location updates
- high volume of concurrent read operations for status checks
- frequent updates to dinosaure feeding/digestion status

These however can be mitigated by some of the things I mentioned in the previous question:

- Adding a queue system to handle the events from the NUDLS feed
- Adding a monitoring system to monitor the database and get alerts for high load and slow queries.
- Add automatic failover mechanisms
- Implement retries for failed transactions

#### 3. FireBase (yes, and no)

It depends how it's to be used. Firebase is a great tool for real-time data, but it's not the best for large scale relational data storage. 

NoSQL databases are great at flat data that can extend in terms of non-related fields, but not so much when it comes to related data.

Firebase datastores are eventually-consistent which means data may not always be availabe immediately. For a safety-critical system, this is not acceptable.

In terms of actual querying of data as well, Firebase is not as powerful as SQL databases.

That said, integrating Firebase for notifications to all connected clients is a great idea. If our app can utilize Firebase for this, it would be a great fit.

