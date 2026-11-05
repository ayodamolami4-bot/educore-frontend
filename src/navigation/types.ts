import type { ComponentType } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PasswordFlow, SchoolContext } from '../api/contracts';
export type RootStackParams = {
  SignIn: undefined;
  Activation: { token?: string } | undefined;
  Recovery: { token?: string } | undefined;
  Password: { flow?: PasswordFlow; change?: boolean };
  ChooseContext: undefined;
  RoleWorkspace: { screenId?: string; resourceId?: string } | undefined;
  Notifications: undefined;
  Settings: undefined;
  VerifyEmail: { token?: string; requestId?: string; maskedDestination?: string } | undefined;
  AccessHelp: undefined;
};
export type SharedScreenProps<Name extends keyof RootStackParams> = NativeStackScreenProps<
  RootStackParams,
  Name
>;
export interface RoleScreenProps {
  context: SchoolContext;
  openShared: (screen: 'Notifications' | 'Settings' | 'ChooseContext') => void;
  target?: { screenId?: string; resourceId?: string };
}
export interface RoleModule {
  name: 'admin' | 'teacher' | 'student' | 'parent';
  title: string;
  HomeScreen: ComponentType<RoleScreenProps> | null;
}
