/**
 * Camera occupancy document shape for vision-ops-camera index and Kafka.
 */
export interface CameraOccupancyPerson {
  person_id: string;
  person_type: string;
  dwell_time: number;
}

export interface CameraOccupancyDocument {
  client_id: string;
  camera_id: string;
  timestamp: string;
  location: string;
  location_id: string;
  occupancy_capacity: number;
  total_person: number;
  person_data: CameraOccupancyPerson[];
  unique_person: number;
}
