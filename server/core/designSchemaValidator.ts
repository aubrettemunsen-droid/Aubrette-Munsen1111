import { GarmentDesignSpec } from '../../src/types/index.ts';

export interface ValidationIssue {
  field: string;
  message: string;
  value?: any;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  emptyFields: string[];
  issues: ValidationIssue[];
}

export class DesignSchemaValidationError extends Error {
  public readonly code: 'EMPTY_FIELD_ERROR' | 'INVALID_SCHEMA_ERROR';
  public readonly emptyFields: string[];
  public readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[], emptyFields: string[] = []) {
    super(message);
    this.name = 'DesignSchemaValidationError';
    this.code = emptyFields.length > 0 ? 'EMPTY_FIELD_ERROR' : 'INVALID_SCHEMA_ERROR';
    this.emptyFields = emptyFields;
    this.issues = issues;
  }
}

/**
 * Checks whether a given value is considered empty:
 * - null or undefined
 * - empty string or string with only whitespace
 * - empty array
 */
export function isEmptyValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim().length === 0) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

export const designSchemaValidator = {
  /**
   * Validates user natural language prompt before triggering AI design parsing.
   * Prevents empty or meaningless calls from invoking model generation and falling back to unintended defaults.
   */
  validateUserPrompt(prompt: unknown): SchemaValidationResult {
    const issues: ValidationIssue[] = [];
    const emptyFields: string[] = [];

    if (isEmptyValue(prompt)) {
      issues.push({
        field: 'userMessage',
        message: '用户设计需求不能为空 (Prompt cannot be empty)',
        value: prompt,
      });
      emptyFields.push('userMessage');
    } else if (typeof prompt === 'string' && prompt.trim().length < 2) {
      issues.push({
        field: 'userMessage',
        message: '用户设计需求描述过短，无法提取服装剪裁特征 (Prompt too short to extract garment features)',
        value: prompt,
      });
    }

    return {
      isValid: issues.length === 0,
      errors: issues.map((i) => i.message),
      emptyFields,
      issues,
    };
  },

  /**
   * Validates a GarmentDesignSpec object against the required schema.
   * Checks for empty values in required and optional attributes.
   * Prevents empty values from polluting prompts or causing models to introduce unintended default suits.
   */
  validateGarmentDesignSpec(spec: unknown, context: string = 'design_spec'): SchemaValidationResult {
    const issues: ValidationIssue[] = [];
    const emptyFields: string[] = [];

    if (!spec || typeof spec !== 'object') {
      issues.push({
        field: 'spec',
        message: `[${context}] 设计规格必须为有效对象 (Design spec must be a valid object)`,
        value: spec,
      });
      return {
        isValid: false,
        errors: issues.map((i) => i.message),
        emptyFields: ['spec'],
        issues,
      };
    }

    const s = spec as Record<string, any>;

    // Core required string fields
    const requiredStringFields: Array<keyof GarmentDesignSpec> = [
      'garmentCategory',
      'targetAudience',
      'designStyle',
      'silhouette',
      'fabricAppearance',
      'primaryColor',
    ];

    for (const field of requiredStringFields) {
      const val = s[field];
      if (isEmptyValue(val)) {
        issues.push({
          field,
          message: `[${context}] 核心字段 '${String(field)}' 不能为空值，以防触发非预期的默认值 (Required field cannot be empty)`,
          value: val,
        });
        emptyFields.push(field);
      }
    }

    // Required array fields
    if (!Array.isArray(s.hardConstraints)) {
      issues.push({
        field: 'hardConstraints',
        message: `[${context}] 硬性约束 hardConstraints 必须为数组`,
        value: s.hardConstraints,
      });
      emptyFields.push('hardConstraints');
    } else {
      if (s.hardConstraints.length === 0) {
        issues.push({
          field: 'hardConstraints',
          message: `[${context}] 硬性约束 hardConstraints 数组不能为空，必须至少包含核心品类与色彩约束`,
          value: s.hardConstraints,
        });
        emptyFields.push('hardConstraints');
      }
      for (let i = 0; i < s.hardConstraints.length; i++) {
        if (isEmptyValue(s.hardConstraints[i])) {
          issues.push({
            field: `hardConstraints[${i}]`,
            message: `[${context}] hardConstraints 包含空项`,
            value: s.hardConstraints[i],
          });
          emptyFields.push(`hardConstraints[${i}]`);
        }
      }
    }

    if (!Array.isArray(s.optionalPreferences)) {
      issues.push({
        field: 'optionalPreferences',
        message: `[${context}] 可选偏好 optionalPreferences 必须为数组`,
        value: s.optionalPreferences,
      });
      emptyFields.push('optionalPreferences');
    } else {
      for (let i = 0; i < s.optionalPreferences.length; i++) {
        if (isEmptyValue(s.optionalPreferences[i])) {
          issues.push({
            field: `optionalPreferences[${i}]`,
            message: `[${context}] optionalPreferences 包含空项`,
            value: s.optionalPreferences[i],
          });
          emptyFields.push(`optionalPreferences[${i}]`);
        }
      }
    }

    // Optional string fields: if present, they must NOT be empty strings (e.g. "" or "   ")
    const optionalStringFields: Array<keyof GarmentDesignSpec> = [
      'collarType',
      'sleeveType',
      'closureType',
      'pocketStyle',
      'intendedUse',
      'renderingStyle',
    ];

    for (const field of optionalStringFields) {
      if (field in s && s[field] !== undefined) {
        if (typeof s[field] === 'string' && s[field].trim().length === 0) {
          issues.push({
            field,
            message: `[${context}] 字段 '${String(field)}' 被显式提供但值为空白字符，请移除该键或填充具体设计定义，以防生成器产生幻觉默认值`,
            value: s[field],
          });
          emptyFields.push(field);
        }
      }
    }

    // Optional arrays
    if ('secondaryColors' in s && s.secondaryColors !== undefined) {
      if (!Array.isArray(s.secondaryColors)) {
        issues.push({
          field: 'secondaryColors',
          message: `[${context}] secondaryColors 必须为数组`,
          value: s.secondaryColors,
        });
        emptyFields.push('secondaryColors');
      } else {
        for (let i = 0; i < s.secondaryColors.length; i++) {
          if (isEmptyValue(s.secondaryColors[i])) {
            issues.push({
              field: `secondaryColors[${i}]`,
              message: `[${context}] secondaryColors 包含空项`,
              value: s.secondaryColors[i],
            });
            emptyFields.push(`secondaryColors[${i}]`);
          }
        }
      }
    }

    if ('decorativeDetails' in s && s.decorativeDetails !== undefined) {
      if (!Array.isArray(s.decorativeDetails)) {
        issues.push({
          field: 'decorativeDetails',
          message: `[${context}] decorativeDetails 必须为数组`,
          value: s.decorativeDetails,
        });
        emptyFields.push('decorativeDetails');
      } else {
        for (let i = 0; i < s.decorativeDetails.length; i++) {
          if (isEmptyValue(s.decorativeDetails[i])) {
            issues.push({
              field: `decorativeDetails[${i}]`,
              message: `[${context}] decorativeDetails 包含空项`,
              value: s.decorativeDetails[i],
            });
            emptyFields.push(`decorativeDetails[${i}]`);
          }
        }
      }
    }

    return {
      isValid: issues.length === 0,
      errors: issues.map((i) => i.message),
      emptyFields,
      issues,
    };
  },

  /**
   * Pre-AI Generation Validation Gate.
   * MUST be called immediately before invoking image synthesis models (e.g. Gemini, Imagen, or rule engine).
   * Throws DesignSchemaValidationError if any empty or invalid values are detected.
   */
  assertValidCandidateForGeneration(candidate: {
    id?: string;
    prompt: string;
    spec: GarmentDesignSpec;
  }): void {
    const issues: ValidationIssue[] = [];
    const emptyFields: string[] = [];

    // 1. Prompt check
    if (isEmptyValue(candidate.prompt)) {
      issues.push({
        field: 'prompt',
        message: '生成图片前必须具备明确的拍摄提示词 (Prompt cannot be empty before generation)',
      });
      emptyFields.push('prompt');
    } else if (candidate.prompt.trim().length < 15) {
      issues.push({
        field: 'prompt',
        message: '提示词细节不足以保证商业高定出图品质 (Prompt too brief for commercial synthesis)',
      });
    }

    // 2. Spec validation
    const specCheck = this.validateGarmentDesignSpec(candidate.spec, `Candidate[${candidate.id || 'new'}]`);
    if (!specCheck.isValid) {
      issues.push(...specCheck.issues);
      emptyFields.push(...specCheck.emptyFields);
    }

    if (issues.length > 0) {
      throw new DesignSchemaValidationError(
        `[Pre-Generation Schema Check Failed] 存在 ${emptyFields.length} 处空值或无效定义，已拦截AI出图以避免渲染非预期默认值: ${issues.map((i) => i.message).join('; ')}`,
        issues,
        emptyFields
      );
    }
  },

  /**
   * Validates conversational design revision inputs before calling revision models.
   */
  validateRevisionInput(params: {
    candidateId?: string;
    revisionInstruction?: string;
    existingSpec?: GarmentDesignSpec;
  }): SchemaValidationResult {
    const issues: ValidationIssue[] = [];
    const emptyFields: string[] = [];

    if (isEmptyValue(params.candidateId)) {
      issues.push({
        field: 'candidateId',
        message: '修改目标方案ID不能为空 (candidateId is required)',
      });
      emptyFields.push('candidateId');
    }

    if (isEmptyValue(params.revisionInstruction)) {
      issues.push({
        field: 'revisionInstruction',
        message: '设计微调指令不能为空 (revisionInstruction is required)',
      });
      emptyFields.push('revisionInstruction');
    } else if (params.revisionInstruction!.trim().length < 2) {
      issues.push({
        field: 'revisionInstruction',
        message: '修改指令过短，无法解析具体调整意图',
      });
    }

    if (params.existingSpec) {
      const specCheck = this.validateGarmentDesignSpec(params.existingSpec, 'ExistingRevisionSpec');
      if (!specCheck.isValid) {
        issues.push(...specCheck.issues);
        emptyFields.push(...specCheck.emptyFields);
      }
    }

    return {
      isValid: issues.length === 0,
      errors: issues.map((i) => i.message),
      emptyFields,
      issues,
    };
  },

  /**
   * Validates multi-view generation inputs before calling image synthesis models.
   */
  validateMultiViewInput(params: {
    candidateId?: string;
    baseImageUrl?: string;
    viewTypes?: string[];
  }): SchemaValidationResult {
    const issues: ValidationIssue[] = [];
    const emptyFields: string[] = [];

    if (isEmptyValue(params.candidateId)) {
      issues.push({
        field: 'candidateId',
        message: '多视角生成方案ID不能为空',
      });
      emptyFields.push('candidateId');
    }

    if (isEmptyValue(params.baseImageUrl)) {
      issues.push({
        field: 'baseImageUrl',
        message: '多视角生成前必须具备已渲染的正面基础主图，不能在未出图前直接生成多视图',
      });
      emptyFields.push('baseImageUrl');
    }

    if (!Array.isArray(params.viewTypes) || params.viewTypes.length === 0) {
      issues.push({
        field: 'viewTypes',
        message: 'viewTypes 必须是非空数组',
      });
      emptyFields.push('viewTypes');
    } else {
      const validViews = ['front', 'back', 'side', 'detail'];
      for (const v of params.viewTypes) {
        if (!validViews.includes(v)) {
          issues.push({
            field: 'viewTypes',
            message: `无效视角名称: ${v}，允许视角: ${validViews.join(', ')}`,
          });
        }
      }
    }

    return {
      isValid: issues.length === 0,
      errors: issues.map((i) => i.message),
      emptyFields,
      issues,
    };
  },

  /**
   * Cleans an incoming partial spec by pruning empty strings and whitespace-only values,
   * while ensuring that user-unspecified fields are left undefined rather than being populated
   * with unintended default suit values.
   */
  cleanUnspecifiedFields<T extends Record<string, any>>(spec: T): T {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(spec)) {
      if (val === null || val === undefined) {
        continue;
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.length > 0) {
          cleaned[key] = trimmed;
        }
      } else if (Array.isArray(val)) {
        const cleanedArr = val
          .map((item) => (typeof item === 'string' ? item.trim() : item))
          .filter((item) => (typeof item === 'string' ? item.length > 0 : Boolean(item)));
        cleaned[key] = cleanedArr;
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned as T;
  },
};
