import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorDetail {
  status: string;
  title: string;
  detail: string;
  code: string;
  source?: { pointer: string };
}

export interface JsonApiErrorResponse {
  errors: ErrorDetail[];
}

/**
 * Handle Prisma errors and convert them to user-friendly JSON:API error responses
 */
export function handlePrismaError(error: unknown, context: string = 'operation'): HttpException {
  console.error(`Error in ${context}:`, error);

  // Handle specific Prisma error codes
  const prismaError = error as { code?: string; meta?: { target?: string[]; field_name?: string } };
  switch (prismaError.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = prismaError.meta?.target?.[0] || 'field';
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.CONFLICT.toString(),
              title: 'Conflict',
              detail: `A record with this ${field} already exists`,
              code: 'DUPLICATE_ENTRY',
              source: { pointer: `/data/attributes/${field}` },
            },
          ],
        },
        HttpStatus.CONFLICT,
      );
    }

    case 'P2003': {
      // Foreign key constraint violation
      const refField = prismaError.meta?.field_name || 'reference';
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.BAD_REQUEST.toString(),
              title: 'Bad Request',
              detail: `Invalid ${refField}. Please check the provided ${refField} and try again.`,
              code: 'INVALID_REFERENCE',
              source: { pointer: `/data/attributes/${refField}` },
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    case 'P2025':
      // Record not found
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.NOT_FOUND.toString(),
              title: 'Not Found',
              detail: 'The requested resource was not found',
              code: 'NOT_FOUND',
            },
          ],
        },
        HttpStatus.NOT_FOUND,
      );

    case 'P2014':
      // Required relation violation
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.BAD_REQUEST.toString(),
              title: 'Bad Request',
              detail: 'Required relationship is missing',
              code: 'MISSING_RELATION',
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );

    case 'P2021':
      // Table does not exist
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
              title: 'Internal Server Error',
              detail: 'Database configuration error',
              code: 'DATABASE_ERROR',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    case 'P2022':
      // Column does not exist
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
              title: 'Internal Server Error',
              detail: 'Database schema error',
              code: 'DATABASE_ERROR',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    default:
      // Generic error for unknown Prisma errors
      return new HttpException(
        {
          errors: [
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
              title: 'Internal Server Error',
              detail: 'An unexpected database error occurred',
              code: 'DATABASE_ERROR',
            },
          ],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
  }
}

/**
 * Create a generic bad request error
 */
export function createBadRequestError(detail: string, code: string = 'BAD_REQUEST'): HttpException {
  return new HttpException(
    {
      errors: [
        {
          status: HttpStatus.BAD_REQUEST.toString(),
          title: 'Bad Request',
          detail,
          code,
        },
      ],
    },
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * Create a generic not found error
 */
export function createNotFoundError(resource: string, id?: string): HttpException {
  const detail = id ? `${resource} with ID ${id} not found` : `${resource} not found`;

  return new HttpException(
    {
      errors: [
        {
          status: HttpStatus.NOT_FOUND.toString(),
          title: 'Not Found',
          detail,
          code: 'NOT_FOUND',
        },
      ],
    },
    HttpStatus.NOT_FOUND,
  );
}

/**
 * Create a generic conflict error
 */
export function createConflictError(detail: string, code: string = 'CONFLICT'): HttpException {
  return new HttpException(
    {
      errors: [
        {
          status: HttpStatus.CONFLICT.toString(),
          title: 'Conflict',
          detail,
          code,
        },
      ],
    },
    HttpStatus.CONFLICT,
  );
}

/**
 * Create a generic internal server error
 */
export function createInternalError(
  detail: string = 'An unexpected error occurred',
): HttpException {
  return new HttpException(
    {
      errors: [
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
          title: 'Internal Server Error',
          detail,
          code: 'INTERNAL_ERROR',
        },
      ],
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
