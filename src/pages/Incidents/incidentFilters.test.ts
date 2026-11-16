import { describe, expect, it } from 'vitest';
import type { Incident } from '../../services/api/types';
import { countIncidentsByStatus, filterIncidents } from './incidentFilters';

const incident = (id: string, status: Incident['status'], type: Incident['type'], name: string): Incident =>
  ({
    incident_id: id,
    order_id: `order-${id}`,
    status,
    type,
    description: 'Detalle',
    order: { customer: { full_name: name, phone_number: '3764111111' } },
  }) as unknown as Incident;

const INCIDENTS = [
  incident('1', 'open', 'damaged', 'Ana Pérez'),
  incident('2', 'resolved', 'no_show', 'Beto Gómez'),
  incident('3', 'open', 'no_show', 'Carla Ruiz'),
  incident('4', 'discarded', 'other', 'Dora Díaz'),
];

describe('filterIncidents', () => {
  it('filtra por estado, por tipo y por término sin tildes', () => {
    expect(filterIncidents(INCIDENTS, { status: 'open', type: 'all', term: '' })).toHaveLength(2);
    expect(filterIncidents(INCIDENTS, { status: 'all', type: 'no_show', term: '' })).toHaveLength(2);
    expect(
      filterIncidents(INCIDENTS, { status: 'discarded', type: 'all', term: '' }).map((i) => i.incident_id),
    ).toEqual(['4']);
    expect(filterIncidents(INCIDENTS, { status: 'all', type: 'all', term: 'perez' }).map((i) => i.incident_id)).toEqual(
      ['1'],
    );
  });

  it('combina los tres filtros', () => {
    expect(filterIncidents(INCIDENTS, { status: 'open', type: 'no_show', term: '' }).map((i) => i.incident_id)).toEqual(
      ['3'],
    );
    expect(filterIncidents(INCIDENTS, { status: 'resolved', type: 'damaged', term: '' })).toHaveLength(0);
  });
});

describe('countIncidentsByStatus', () => {
  it('cuenta abiertas, resueltas, descartadas y el total, sin NaN con una descartada', () => {
    expect(countIncidentsByStatus(INCIDENTS)).toEqual({ open: 2, resolved: 1, discarded: 1, all: 4 });
  });
});
