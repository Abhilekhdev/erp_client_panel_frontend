import { api } from '@/lib/api/axios';
import type { AuthUser } from '@/types/auth';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface BankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  branch?: string;
  taxPayerId?: string;
}

/** Full editable self-profile returned by GET /auth/profile. */
export interface MyProfile {
  id: number;
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  language: string;
  avatar: string | null;
  avatarUrl: string | null;
  dob: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  contactNumber: string;
  altNumber: string;
  familyNumber: string;
  fbLink: string;
  twitterLink: string;
  socialMedia1: string;
  socialMedia2: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  guardianName: string;
  idProofName: string;
  idProofNumber: string;
  permanentAddress: string;
  currentAddress: string;
  bankDetails: BankDetails | null;
}

export type ProfileUpdate = Omit<
  MyProfile,
  'id' | 'username' | 'avatar' | 'avatarUrl' | 'bankDetails'
> & { bankDetails?: BankDetails };

export async function getMyProfile(): Promise<MyProfile> {
  const { data } = await api.get<Envelope<MyProfile>>('/auth/profile');
  return data.data;
}

export async function updateMyProfile(body: ProfileUpdate): Promise<AuthUser> {
  const { data } = await api.patch<Envelope<AuthUser>>('/auth/profile', body);
  return data.data;
}

export async function changeMyPassword(body: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  await api.post('/auth/change-password', body);
}

export async function uploadMyPhoto(file: File): Promise<AuthUser> {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await api.post<Envelope<AuthUser>>('/auth/profile/photo', form);
  return data.data;
}
