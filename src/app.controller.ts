import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import * as promClient from 'prom-client';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/metrics')
  async metrics(@Res() res: Response) {
    try {
      const metrics = await promClient.register.metrics();
      res.setHeader('Content-Type', promClient.register.contentType);
      res.send(metrics);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
}
