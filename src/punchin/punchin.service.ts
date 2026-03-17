import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PunchinEntry } from './punchin.model';
import { PunchinRepository } from './punchin.repository';
import { CreatePunchinDto } from './dto/create-punchin.dto';

@Injectable()
export class PunchinService {
  constructor(private readonly repo: PunchinRepository) {}

  /**
   * Resolve DTO into a persisted punch entry.  The auth token is
   * converted to an email here (stubbed).
   */
  record(dto: CreatePunchinDto): PunchinEntry {
    const userEmail = this.resolveEmail(dto.authToken);
    const entry: PunchinEntry = {
      timestamp: new Date(dto.timestamp),
      platform: dto.platform,
      userEmail,
    };
    // apply additional rules (no back‑to‑back punches, etc.)
    return this.repo.create(entry);
  }

  list(): PunchinEntry[] {
    return this.repo.findAll();
  }

  private resolveEmail(token: string): string {
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('Authentication token is missing or empty');
    }

    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || typeof decoded.emailAddress !== 'string' || decoded.emailAddress.trim() === '') {
        throw new UnauthorizedException('Invalid token: emailAddress is missing');
      }
      return decoded.emailAddress;
    } catch (error) {
       if (error instanceof UnauthorizedException) {
           throw error;
       }
       throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
