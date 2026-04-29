import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
  });

  it('throws on module init when running in production without JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    const module = new AuthModule();
    expect(() => module.onModuleInit()).toThrow(
      'JWT_SECRET is required in production',
    );
  });

  it('does not throw when JWT_SECRET is configured in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'configured-secret';

    const module = new AuthModule();
    expect(() => module.onModuleInit()).not.toThrow();
  });
});
