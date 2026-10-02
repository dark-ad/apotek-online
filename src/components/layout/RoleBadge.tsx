import React from 'react';
import { UserRole } from '../../types';
import { User, ShieldCheck, Stethoscope } from 'lucide-react';

interface RoleBadgeProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ currentRole, onRoleChange }) => {
  const roles: { role: UserRole; label: string; icon: React.ReactNode }[] = [
    { role: 'pembeli', label: 'Pembeli', icon: <User size={13} /> },
    { role: 'staf', label: 'Staf Apotek', icon: <Stethoscope size={13} /> },
    { role: 'admin', label: 'Admin', icon: <ShieldCheck size={13} /> },
  ];

  return (
    <div className="role-selector-box" title="Simulasi Penggantian Role (Tahap 1)">
      <span style={{ fontSize: '0.72rem', color: 'var(--secondary-500)', fontWeight: 600, paddingLeft: '0.25rem' }}>
        Role:
      </span>
      {roles.map((r) => (
        <button
          key={r.role}
          onClick={() => onRoleChange(r.role)}
          className={`role-btn ${currentRole === r.role ? 'active' : ''}`}
          type="button"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            {r.icon}
            {r.label}
          </span>
        </button>
      ))}
    </div>
  );
};
