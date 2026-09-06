describe('Environment validation fails closed on weak or placeholder secrets', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.PORT = '5000';
    process.env.DB_HOST = 'postgres';
    process.env.DB_NAME = 'skyraksys_hrm';
    process.env.DB_USER = 'hrm_admin';
    process.env.DB_PASSWORD = 'StrongDbPassword!2026';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.JWT_REFRESH_SECRET = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    process.env.ENCRYPTION_KEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    process.env.INVOICE_SECRET_PHRASE = 'REPLACE_WITH_INVOICE_PHRASE';
    process.env.SEED_DEFAULT_PASSWORD = 'admin123';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects placeholder and default credentials before startup', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    const { validate } = require('../../../config/validateEnv');

    expect(() => validate()).toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('rejects the shipped weak invoice secret default phrase', () => {
    process.env.INVOICE_SECRET_PHRASE = 'SkyraskysHRSecret';
    process.env.SEED_DEFAULT_PASSWORD = 'StrongSeedPassword!2026';

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    const { validate } = require('../../../config/validateEnv');

    expect(() => validate()).toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('requires a production payroll vault key before startup', () => {
    delete process.env.PAYROLL_VAULT_KEY;
    process.env.INVOICE_SECRET_PHRASE = 'StrongInvoiceSecretPhrase!2026';
    process.env.SEED_DEFAULT_PASSWORD = 'StrongSeedPassword!2026';

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    const { validate } = require('../../../config/validateEnv');

    expect(() => validate()).toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
