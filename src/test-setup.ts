import "@testing-library/jest-dom";
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.reject(new Error("Unexpected request")));
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
