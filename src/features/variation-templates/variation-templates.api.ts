import { api } from '@/lib/api/axios';

export interface VariationValue {
  id: number;
  name: string;
}
export interface VariationTemplate {
  id: number;
  name: string;
  values: VariationValue[];
}
export interface VariationTemplateBody {
  name: string;
  values: string[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listVariationTemplates(): Promise<VariationTemplate[]> {
  const { data } = await api.get<Envelope<{ data: VariationTemplate[] }>>('/variation-templates');
  return data.data.data;
}
export async function createVariationTemplate(body: VariationTemplateBody): Promise<VariationTemplate> {
  const { data } = await api.post<Envelope<VariationTemplate>>('/variation-templates', body);
  return data.data;
}
export async function updateVariationTemplate(id: number, body: VariationTemplateBody): Promise<VariationTemplate> {
  const { data } = await api.patch<Envelope<VariationTemplate>>(`/variation-templates/${id}`, body);
  return data.data;
}
export async function deleteVariationTemplate(id: number): Promise<void> {
  await api.delete(`/variation-templates/${id}`);
}
