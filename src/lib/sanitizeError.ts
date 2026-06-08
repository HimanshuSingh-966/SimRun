export function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Raw Error:', error);
  }

  // Handle Supabase/PostgREST errors
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Auth ApiError
    if (err.name === 'AuthApiError' || err.code) {
      const code = String(err.code);
      const status = Number(err.status);
      
      if (status === 400 || status === 401 || status === 403) {
         if (typeof err.message === 'string' && err.message.toLowerCase().includes('invalid login credentials')) {
           return 'Invalid email or password.';
         }
         if (typeof err.message === 'string' && err.message.toLowerCase().includes('email not confirmed')) {
           return 'Please verify your email address before logging in.';
         }
      }
      
      // PostgreSQL Error Codes
      if (code === '23505') {
        return 'This record already exists. Please check your details or contact support.';
      }
      if (code === '42501' || code === '42P01') {
        return 'You do not have permission to perform this action.';
      }
      // General PostgREST/Supabase code fallback
      if (code.startsWith('PGRST') || code.match(/^\d{5}$/)) {
        return 'A database error occurred. Please try again later.';
      }
    }
    
    // Standard JS Error with generic messages we might want to let through
    if (err instanceof Error) {
       // Filter out sensitive strings
       if (!err.message.includes('relation') && 
           !err.message.includes('policy') && 
           !err.message.includes('row-level security') &&
           !err.message.includes('column') &&
           !err.message.includes('syntax')) {
           // Provide safe standard messages or generic fallback
           return err.message;
       }
    }
  }

  // Fallback string if it's just a string, but hide if it looks like a DB error
  if (typeof error === 'string') {
      if (!error.includes('relation') && !error.includes('policy') && !error.includes('SQL')) {
          return error;
      }
  }

  return 'An unexpected error occurred. Please try again.';
}
