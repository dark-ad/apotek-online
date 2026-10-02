import React from 'react';
import { ROLE_DATA } from '../../data/mockData';
import { UserRole } from '../../types';
import { 
  User, 
  Stethoscope, 
  ShieldCheck, 
  CheckCircle, 
  Layers
} from 'lucide-react';

interface RoleFlowSectionProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleFlowSection: React.FC<RoleFlowSectionProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'pembeli':
        return <User size={26} color="#10b981" />;
      case 'staf':
        return <Stethoscope size={26} color="#0284c7" />;
      case 'admin':
        return <ShieldCheck size={26} color="#8b5cf6" />;
    }
  };

  return (
    <section id="alur-role" className="section" style={{ background: '#f8fafc' }}>
      <div className="container">
        <div className="section-header">
          <span className="section-tag">
            <Layers size={14} />
            Arsitektur 3 Role PRD
          </span>
          <h2 className="section-title">Ekosistem Terpadu Multi-Peran</h2>
          <p className="section-desc">
            Apotek Online + AI dirancang dengan pembagian hak akses dan antarmuka terdedikasi untuk kenyamanan Pembeli, akurasi Staf Apotek, serta kontrol penuh Administrator.
          </p>
        </div>

        <div className="role-grid">
          {ROLE_DATA.map((info) => {
            const isActive = currentRole === info.role;

            return (
              <div 
                key={info.role} 
                className={`role-card role-${info.role}`}
                style={{
                  boxShadow: isActive ? '0 0 0 2px var(--secondary-900), var(--shadow-xl)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div 
                    className="role-icon-box"
                    style={{ backgroundColor: `${info.color}15` }}
                  >
                    {getRoleIcon(info.role)}
                  </div>
                  <span 
                    className="badge badge-role"
                    style={{
                      backgroundColor: `${info.color}20`,
                      color: info.color,
                      borderColor: `${info.color}40`,
                    }}
                  >
                    {info.badgeLabel}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                    {info.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--secondary-600)', lineHeight: 1.55 }}>
                    {info.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-700)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.65rem' }}>
                    Fitur & Kapabilitas:
                  </span>
                  <ul className="role-feature-list">
                    {info.primaryFeatures.map((feat, i) => (
                      <li key={i} className="role-feature-item">
                        <CheckCircle size={15} color={info.color} style={{ flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onRoleChange(info.role)}
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  <span>{isActive ? 'Role Sedang Aktif' : `Beralih ke Simulasi ${info.badgeLabel}`}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
