module.exports = class StandardizedError extends Error {
  constructor(
    message,
    name = 'Error',
    part = 'UNKNOWN_PART',
    tag = 'UNKNOWN_ERROR',
    status_code = 500,
    handler = () => {},
  ) {
    super(message);
    this.name = name;
    this.part = part;
    this.tag = tag;
    this.status_code = status_code;
    this.handler = handler;
  }
};
