export interface SystemSetting {
    id: number;
    settingKey: string;
    settingValue: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SystemSettingUpdate {
    settingValue: string;
    description?: string;
}

export interface SystemSettingCreate {
    settingKey: string;
    settingValue: string;
    description?: string;
}
