// Source - https://stackoverflow.com/a/68641378
// Posted by Solz, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-03, License - CC BY-SA 4.0

import express from "express";

declare global {
  namespace Express {
    interface Request {
<<<<<<< HEAD
      user?: Record<string,any>
=======
      user?: Record<string,any> | null
>>>>>>> 58fdc9a3c9c3434f59723345178218d32b335a3e
    }
  }
}
