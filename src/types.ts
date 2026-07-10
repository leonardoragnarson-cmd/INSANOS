/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MCEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  isPaid: boolean;
  price?: number;
  pixKey?: string;
  flyerUrl?: string; // Stored as a compressed base64 JPEG string
  logoUrl?: string; // Stored as a compressed base64 JPEG string
  status: 'open' | 'closed';
  active: boolean;
  createdAt: any;
}

export interface Registration {
  id: string;
  eventId: string;
  name: string;
  coleteName: string;
  regional: string;
  division: string;
  phone: string;
  registeredAt: any;
}
