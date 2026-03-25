import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PunchinEntry } from './punchin.model';
import { PunchinRepositoryPort } from './punchin.repository.port';
import { CreatePunchinDto } from './dto/create-punchin.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class PunchinService {
  constructor(
    private readonly repo: PunchinRepositoryPort,
    private readonly userService: UserService
  ) {}

  /**
   * Resolve DTO into a persisted punch entry.  The auth token is
   * converted to an email here (stubbed).
   */
  async record(dto: CreatePunchinDto): Promise<PunchinEntry> {
    const userEmail = this.resolveEmail(dto.authToken);
    
    try {
      await this.userService.findUserByEmailAddress(userEmail);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }

    const entry: PunchinEntry = {
      timestamp: new Date(dto.timestamp),
      platform: dto.platform,
      userEmail,
    };
    // apply additional rules (no back‑to‑back punches, etc.)
    return await this.repo.save(entry);
  }

  async list(): Promise<PunchinEntry[]> {
    return await this.repo.findAll();
  }

  async getPunchinsFromUser(emailAddress: string): Promise<PunchinEntry[]> {
    await this.userService.findUserByEmailAddress(emailAddress);
    return await this.repo.findBy({ userEmail: emailAddress });
  }

  private resolveEmail(token: string): string {
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('Authentication token is missing or empty');
    }

    const secret = process.env.JWT_SECRET || 'my-super-secret-key';

    try {
      const decoded = jwt.verify(token, secret) as any;
      if (!decoded || typeof decoded.emailAddress !== 'string' || decoded.emailAddress.trim() === '') {
        throw new UnauthorizedException('Invalid token: emailAddress is missing');
      }
      return decoded.emailAddress;
    } catch (error) {
       if (error instanceof UnauthorizedException) {
           throw error;
       }
       throw new UnauthorizedException('Invalid authentication signature or token');
    }
  }
}
