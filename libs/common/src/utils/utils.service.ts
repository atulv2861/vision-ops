import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  /**
   * Return a short description for a card based on category, current value, and total.
   * Uses category-specific phrasing when defined; otherwise a default with count/percentage.
   */
  cardsDescription(category: string, current: number, total: number): string {
    const safeTotal = total > 0 ? total : 1;
    const pct = Math.round((current / safeTotal) * 100);
    const categoryKey = (category || '').toLowerCase().replace(/\s+/g, '_');

    switch (categoryKey) {
      case 'student':
        return 'on campus';
      case 'students':
        return 'on campus';
      case 'students_on_campus':
        return 'across all spaces';
      case 'staff':
        return `${pct}% of total`;
      case 'staff_present':
        return `${pct}% of total`;
      case 'faculty':
        return `${pct}% of total`;
      case 'maintenance':
        return `${pct}% of total`;
      case 'security_guard':
        return 'on duty';
      case 'contractor':
        return `${pct}% of total`;
      case 'visitor':
        return 'detected today';
      case 'active_events':
        return 'detected today';
      case 'coach':
        return 'on site';
      case 'researcher':
        return 'in lab';
      case 'librarian':
        return 'on floor';
      case 'admin':
        return 'in administration';
      default:
        return total > 0 ? `${current} of ${total} total` : `${current}`;
    }
  }

  createQuery(client_id: string, camera_ids?: string[], from?: string, to?: string) {
    const match_query = [];
    if (client_id && client_id.trim() !== '' && client_id.trim() !== 'null') {
      match_query.push({ match: { client_id: client_id } });
    }
    if (camera_ids && camera_ids.length > 0) {
      match_query.push({ terms: { camera_id: camera_ids } });
    }
    if (from && from.trim() !== '' && from.trim() !== 'null') {
      match_query.push({ range: { timestamp: { gte: from, lte: to } } });
    }
    return match_query;
  }
}
