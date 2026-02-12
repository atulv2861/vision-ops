/**
 * vision-ops-camera index definition.
 * Stores camera occupancy / person data (camera_id, timestamp, location, person_data, etc.).
 */

export const VISION_OPS_CAMERA_INDEX_NAME = 'vision-ops-camera';

export const VISION_OPS_CAMERA_INDEX_MAPPING = {
  properties: {
    client_id: { type: 'keyword' as const },
    camera_id: { type: 'keyword' as const },
    timestamp: {
      type: 'date' as const,
      format: 'strict_date_optional_time||yyyy-MM-dd HH:mm:ss||epoch_millis',
    },
    location: { type: 'keyword' as const },
    location_id: { type: 'keyword' as const },
    occupancy_capacity: { type: 'integer' as const },
    total_person: { type: 'integer' as const },
    person_data: {
      type: 'nested' as const,
      properties: {
        person_id: { type: 'keyword' as const },
        person_type: { type: 'keyword' as const },
        dwell_time: { type: 'integer' as const },
      },
    },
    unique_person: { type: 'integer' as const },
  },
};

export const VISION_OPS_CAMERA_INDEX_SETTINGS = {
  number_of_shards: 1,
  number_of_replicas: 0,
};
