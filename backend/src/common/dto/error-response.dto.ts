import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: 'Code HTTP' })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['Le mot de passe doit contenir au moins 10 caractères'],
    description: 'Message lisible, ou liste des erreurs de validation',
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request', required: false })
  error?: string;
}
