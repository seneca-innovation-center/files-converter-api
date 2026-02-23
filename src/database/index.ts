import { User, UserSchema } from '../modules/users/models/user.schema';

export const MONGOOSE_MODELS = [{ name: User.name, schema: UserSchema }];
