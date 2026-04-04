import { User } from "../../../db/schema";

type SafeUser = {
  firstName: string;
  lastName: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export const userSanitize = (user: User):SafeUser => {
  const allowedOutput = {
    firstName: user.firstName,
    lastName: user?.lastName,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return allowedOutput;
};
