export type EventKind = 
  | 'dino_added'
  | 'dino_fed'
  | 'dino_location_updated'
  | 'dino_removed'
  | 'maintenance_performed';

export interface BaseEvent {
  kind: EventKind;
  park_id: number;
  time: string;
}

export interface DinoAddedEvent extends BaseEvent {
  kind: 'dino_added';
  name: string;
  species: string;
  gender: string;
  id: number;
  digestion_period_in_hours: number;
  herbivore: boolean;
}

export interface DinoFedEvent extends BaseEvent {
  kind: 'dino_fed';
  dinosaur_id: number;
}

export interface DinoLocationEvent extends BaseEvent {
  kind: 'dino_location_updated';
  location: string;
  dinosaur_id: number;
}

export interface DinoRemovedEvent extends BaseEvent {
  kind: 'dino_removed';
  dinosaur_id: number;
}

export interface MaintenanceEvent extends BaseEvent {
  kind: 'maintenance_performed';
  location: string;
}

export type FeedEvent = 
  | DinoAddedEvent 
  | DinoFedEvent 
  | DinoLocationEvent 
  | DinoRemovedEvent 
  | MaintenanceEvent;