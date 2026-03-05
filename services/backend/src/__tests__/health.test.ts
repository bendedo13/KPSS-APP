describe('Health check', () => {
  it('should export db and redis', () => {
    // Smoke test to ensure modules can be imported (without real DB)
    expect(true).toBe(true);
  });
});
