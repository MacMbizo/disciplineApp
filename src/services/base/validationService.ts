/**
 * Validation Service for MCC Discipline Tracker
 * 
 * This service provides centralized data validation for the application.
 * It implements validation rules for different data types and entities.
 * 
 * @fileoverview Centralized validation service
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation rule interface
 */
interface ValidationRule {
  validate(value: any, fieldName: string): ValidationError | null;
}

/**
 * Required field validation rule
 */
class RequiredRule implements ValidationRule {
  validate(value: any, fieldName: string): ValidationError | null {
    if (value === undefined || value === null || value === '') {
      return {
        field: fieldName,
        message: `${fieldName} is required`,
      };
    }
    return null;
  }
}

/**
 * Minimum length validation rule
 */
class MinLengthRule implements ValidationRule {
  constructor(private minLength: number) {}
  
  validate(value: any, fieldName: string): ValidationError | null {
    if (value !== undefined && value !== null && value.length < this.minLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${this.minLength} characters`,
      };
    }
    return null;
  }
}

/**
 * Maximum length validation rule
 */
class MaxLengthRule implements ValidationRule {
  constructor(private maxLength: number) {}
  
  validate(value: any, fieldName: string): ValidationError | null {
    if (value !== undefined && value !== null && value.length > this.maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at most ${this.maxLength} characters`,
      };
    }
    return null;
  }
}

/**
 * Email validation rule
 */
class EmailRule implements ValidationRule {
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  validate(value: any, fieldName: string): ValidationError | null {
    if (value !== undefined && value !== null && value !== '' && !this.emailRegex.test(value)) {
      return {
        field: fieldName,
        message: `${fieldName} must be a valid email address`,
      };
    }
    return null;
  }
}

/**
 * Pattern validation rule
 */
class PatternRule implements ValidationRule {
  constructor(private pattern: RegExp, private errorMessage: string) {}
  
  validate(value: any, fieldName: string): ValidationError | null {
    if (value !== undefined && value !== null && value !== '' && !this.pattern.test(value)) {
      return {
        field: fieldName,
        message: this.errorMessage.replace('{field}', fieldName),
      };
    }
    return null;
  }
}

/**
 * Enum validation rule
 */
class EnumRule implements ValidationRule {
  constructor(private allowedValues: any[]) {}
  
  validate(value: any, fieldName: string): ValidationError | null {
    if (value !== undefined && value !== null && !this.allowedValues.includes(value)) {
      return {
        field: fieldName,
        message: `${fieldName} must be one of: ${this.allowedValues.join(', ')}`,
      };
    }
    return null;
  }
}

/**
 * Custom validation rule
 */
class CustomRule implements ValidationRule {
  constructor(
    private validatorFn: (value: any) => boolean,
    private errorMessage: string
  ) {}
  
  validate(value: any, fieldName: string): ValidationError | null {
    if (value !== undefined && value !== null && !this.validatorFn(value)) {
      return {
        field: fieldName,
        message: this.errorMessage.replace('{field}', fieldName),
      };
    }
    return null;
  }
}

/**
 * Field validator class
 */
class FieldValidator {
  private rules: ValidationRule[] = [];
  
  constructor(private fieldName: string) {}
  
  /**
   * Add required rule
   */
  required(): FieldValidator {
    this.rules.push(new RequiredRule());
    return this;
  }
  
  /**
   * Add minimum length rule
   * @param minLength - Minimum length
   */
  minLength(minLength: number): FieldValidator {
    this.rules.push(new MinLengthRule(minLength));
    return this;
  }
  
  /**
   * Add maximum length rule
   * @param maxLength - Maximum length
   */
  maxLength(maxLength: number): FieldValidator {
    this.rules.push(new MaxLengthRule(maxLength));
    return this;
  }
  
  /**
   * Add email rule
   */
  email(): FieldValidator {
    this.rules.push(new EmailRule());
    return this;
  }
  
  /**
   * Add pattern rule
   * @param pattern - Regular expression pattern
   * @param errorMessage - Error message
   */
  pattern(pattern: RegExp, errorMessage: string): FieldValidator {
    this.rules.push(new PatternRule(pattern, errorMessage));
    return this;
  }
  
  /**
   * Add enum rule
   * @param allowedValues - Allowed values
   */
  enum(allowedValues: any[]): FieldValidator {
    this.rules.push(new EnumRule(allowedValues));
    return this;
  }
  
  /**
   * Add custom rule
   * @param validatorFn - Validator function
   * @param errorMessage - Error message
   */
  custom(validatorFn: (value: any) => boolean, errorMessage: string): FieldValidator {
    this.rules.push(new CustomRule(validatorFn, errorMessage));
    return this;
  }
  
  /**
   * Validate field
   * @param value - Field value
   * @returns Array of validation errors
   */
  validate(value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const rule of this.rules) {
      const error = rule.validate(value, this.fieldName);
      if (error) {
        errors.push(error);
      }
    }
    
    return errors;
  }
}

/**
 * Schema validator class
 */
export class SchemaValidator {
  private fields: Map<string, FieldValidator> = new Map();
  
  /**
   * Define field validator
   * @param fieldName - Field name
   * @returns Field validator
   */
  field(fieldName: string): FieldValidator {
    const validator = new FieldValidator(fieldName);
    this.fields.set(fieldName, validator);
    return validator;
  }
  
  /**
   * Validate data against schema
   * @param data - Data to validate
   * @returns Validation result
   */
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const [fieldName, validator] of this.fields.entries()) {
      const fieldErrors = validator.validate(data[fieldName]);
      errors.push(...fieldErrors);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Validation service singleton
 */
export class ValidationService {
  private static instance: ValidationService;
  private schemas: Map<string, SchemaValidator> = new Map();
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.initializeSchemas();
  }
  
  /**
   * Initialize validation schemas
   */
  private initializeSchemas(): void {
    // User schema
    const userSchema = new SchemaValidator();
    userSchema.field('email').required().email();
    userSchema.field('displayName').required().minLength(2).maxLength(50);
    userSchema.field('role').required().enum(['admin', 'teacher', 'staff']);
    this.schemas.set('user', userSchema);
    
    // Incident schema
    const incidentSchema = new SchemaValidator();
    incidentSchema.field('studentId').required();
    incidentSchema.field('type').required().enum(['behavioral', 'academic', 'attendance']);
    incidentSchema.field('severity').required().enum(['low', 'medium', 'high']);
    incidentSchema.field('description').required().minLength(10).maxLength(500);
    this.schemas.set('incident', incidentSchema);
    
    // Add more schemas as needed
  }
  
  /**
   * Register schema
   * @param schemaName - Schema name
   * @param schema - Schema validator
   */
  public registerSchema(schemaName: string, schema: SchemaValidator): void {
    this.schemas.set(schemaName, schema);
  }
  
  /**
   * Get schema
   * @param schemaName - Schema name
   * @returns Schema validator
   * @throws Error if schema is not registered
   */
  public getSchema(schemaName: string): SchemaValidator {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema not registered: ${schemaName}`);
    }
    return schema;
  }
  
  /**
   * Validate data against schema
   * @param schemaName - Schema name
   * @param data - Data to validate
   * @returns Validation result
   * @throws Error if schema is not registered
   */
  public validate(schemaName: string, data: any): ValidationResult {
    return this.getSchema(schemaName).validate(data);
  }
  
  /**
   * Validate data against schema and throw error if invalid
   * @param schemaName - Schema name
   * @param data - Data to validate
   * @throws Error with validation errors if data is invalid
   */
  public validateOrThrow(schemaName: string, data: any): void {
    const result = this.validate(schemaName, data);
    if (!result.isValid) {
      throw new Error(
        `Validation failed: ${result.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`
      );
    }
  }
  
  /**
   * Create schema builder
   * @returns New schema validator
   */
  public createSchema(): SchemaValidator {
    return new SchemaValidator();
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();