import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'minAge', async: false })
export class MinAgeConstraint implements ValidatorConstraintInterface {
  validate(birthdate: any, args: ValidationArguments) {
    if (!birthdate) return false;
    const ageLimit = args.constraints[0];
    const date = new Date(birthdate);
    if (isNaN(date.getTime())) return false;
    
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age >= ageLimit;
  }

  defaultMessage(args: ValidationArguments) {
    return `User must be at least ${args.constraints[0]} years old`;
  }
}

export function MinAge(age: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [age],
      validator: MinAgeConstraint,
    });
  };
}
