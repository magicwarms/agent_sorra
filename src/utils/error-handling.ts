export class ElysiaError extends Error {
  constructor(
    public message: any,
    public code: any,
    public statusCode: number = 500,
  ) {
    super(message);
  }

  toResponse() {
    if (this.code === "VALIDATION") {
      this.statusCode = 400;
    }

    return Response.json(
      {
        success: false,
        message: {
          message: this.message,
          code: this.statusCode,
        },
        data: null,
      },
      { status: this.statusCode },
    );
  }
}
