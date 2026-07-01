import { Injectable } from '@nestjs/common';
import { PrismaService } from '@flipflop/shared';

type RuianAddressRow = {
  ruian_address_id: number;
  address_line1: string;
  address_line2: string;
  municipality_name: string;
  postal_code: string;
};

type AddressSuggestion = {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  provider: 'ruian';
};

@Injectable()
export class AddressAutocompleteService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(query: string): Promise<AddressSuggestion[]> {
    const normalized = this.normalizeQuery(query).slice(0, 160);
    if (normalized.length < 3) {
      return [];
    }

    const tokens = normalized
      .split(' ')
      .filter((token) => token.length >= 2)
      .slice(0, 6);
    const where = tokens.map((_, index) => `search_text ILIKE $${index + 1}`).join(' AND ');
    const rankParam = tokens.length + 1;

    const rows = await this.prisma.$queryRawUnsafe<RuianAddressRow[]>(
      `
        SELECT
          ruian_address_id,
          address_line1,
          address_line2,
          municipality_name,
          postal_code
        FROM ruian_address_points
        WHERE ${where}
        ORDER BY
          CASE WHEN search_text LIKE $${rankParam + 1} THEN 0 ELSE 1 END,
          similarity(search_text, $${rankParam}) DESC,
          municipality_name ASC,
          address_line1 ASC
        LIMIT 12
      `,
      ...tokens.map((token) => `%${token}%`),
      normalized,
      `${normalized}%`,
    );

    return rows.map((row) => this.toSuggestion(row));
  }

  async details(placeId: string): Promise<AddressSuggestion | null> {
    const match = /^ruian:(\d+)$/.exec(placeId);
    if (!match) {
      return null;
    }

    const rows = await this.prisma.$queryRawUnsafe<RuianAddressRow[]>(
      `
        SELECT
          ruian_address_id,
          address_line1,
          address_line2,
          municipality_name,
          postal_code
        FROM ruian_address_points
        WHERE ruian_address_id = $1
        LIMIT 1
      `,
      Number(match[1]),
    );

    return rows[0] ? this.toSuggestion(rows[0]) : null;
  }

  private toSuggestion(row: RuianAddressRow): AddressSuggestion {
    return {
      id: `ruian:${row.ruian_address_id}`,
      label: `${row.address_line1}, ${row.address_line2}`,
      street: row.address_line1,
      city: row.municipality_name,
      postalCode: this.formatPostalCode(row.postal_code),
      country: 'Česká republika',
      provider: 'ruian',
    };
  }

  private formatPostalCode(postalCode: string): string {
    const compact = postalCode.replace(/\D/g, '');
    return compact.length === 5 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : postalCode;
  }

  private normalizeQuery(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
