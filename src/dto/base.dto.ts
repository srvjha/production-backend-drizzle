import { z } from "zod";

class BaseDto {
  static schema: z.ZodTypeAny = z.object({});

  static async validate(data: any): Promise<any> {
    return await this.schema.parseAsync(data);
  }
}

export default BaseDto;
