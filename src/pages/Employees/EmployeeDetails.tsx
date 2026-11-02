import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { KeyRound, LogOut, PencilLine, RotateCcw, Trash2 } from 'lucide-react';
import {
  AuditHistoryLink,
  Avatar,
  Badge,
  Button,
  Card,
  DetailList,
  EntityPhoto,
  ErrorState,
  PageCover,
  PageHeader,
  PhotoThumb,
  ProfileSkeleton,
  ProfileTabPanel,
  ProfileTabs,
  type CoverStat,
  type ProfileTabItem,
  PageContainer,
  type MenuAction,
} from '../../common/components/ui';
import { useCrumbLeaf } from '../../common/components';
import { useBackToList, usePermissions, useProfileTab } from '../../hooks';
import { useDeleteEmployee, useEmployee } from '../../services/queries/employees';
import { formatDay } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { EmployeeAttendanceTab } from './components/EmployeeAttendanceTab';
import { EmployeeDocumentsTab } from './components/EmployeeDocumentsTab';
import { EmployeeLeavesTab } from './components/EmployeeLeavesTab';
import { GrantAccountModal } from './components/GrantAccountModal';
import { ReinstateEmployeeModal } from './components/ReinstateEmployeeModal';
import { TerminateEmployeeModal } from './components/TerminateEmployeeModal';
import { employeePhotoOwner } from './employeePhotoOwner';
import {
  DOCUMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  TERMINATION_REASON_LABELS,
  employeeFullName,
} from './employeeLabels';

const TAB_KEYS = ['summary', 'documents', 'attendance', 'leaves'];

export const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/employees');
  const { canWrite, writeHint } = usePermissions();
  const { data: employee, isPending, error, refetch } = useEmployee(id);
  const deleteEmployee = useDeleteEmployee();
  const { pathname, search } = useLocation();
  const edit = () => navigate(`/employees/${id}/edit`, { state: { from: `${pathname}${search}` } });
  const [terminating, setTerminating] = useState(false);
  const [reinstating, setReinstating] = useState(false);
  const [granting, setGranting] = useState(false);
  const [tab, setTab] = useProfileTab(TAB_KEYS, 'summary');

  const name = employee ? employeeFullName(employee) : 'Sin nombre';
  useCrumbLeaf(employee ? name : undefined, goBack);

  const handleDelete = async () => {
    if (!employee) return;
    const confirmed = await confirm({
      title: '¿Eliminar el legajo?',
      text: `Sólo corresponde si se dio de alta por error. El legajo de ${name} deja de listarse.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    deleteEmployee.mutate(employee.employeeId, {
      onSuccess: () => {
        notify.success('Legajo eliminado');
        navigate('/employees');
      },
      onError: notify.error,
    });
  };

  const tabs: ProfileTabItem[] = [
    { key: 'summary', label: 'Resumen' },
    { key: 'documents', label: 'Documentación' },
    { key: 'attendance', label: 'Asistencia' },
    { key: 'leaves', label: 'Licencias' },
  ];
  const coverStats: CoverStat[] = employee
    ? [
        { label: 'Legajo', value: employee.fileNumber },
        { label: 'Ingreso', value: formatDay(employee.hireDate) },
        { label: 'Modalidad', value: EMPLOYMENT_TYPE_LABELS[employee.employmentType] },
      ]
    : [];
  const photoOwner = employeePhotoOwner(employee ?? { employeeId: '', hasAccount: false, userId: null });

  // La primaria depende del estado: un legajo activo se edita; uno egresado se reincorpora. Egreso, cuenta y baja van al menú ⋮.
  const canCreateAccount =
    employee?.status === 'active' && !employee.hasAccount && employee.position.category === 'driver';
  const headerPrimary = employee ? (
    <>
      <AuditHistoryLink entity="Employee" recordId={employee.employeeId} />
      {employee.status === 'terminated' ? (
        <Button
          size="sm"
          icon={<RotateCcw />}
          blockedReason={writeHint}
          onClick={() => canWrite && setReinstating(true)}
        >
          Reincorporar
        </Button>
      ) : (
        <Button size="sm" icon={<PencilLine />} blockedReason={writeHint} onClick={() => canWrite && edit()}>
          Editar legajo
        </Button>
      )}
    </>
  ) : undefined;
  const headerSecondary: MenuAction[] = employee
    ? [
        ...(employee.status === 'terminated'
          ? [
              {
                label: 'Editar legajo',
                icon: <PencilLine />,
                blockedReason: writeHint,
                onClick: () => canWrite && edit(),
              },
            ]
          : []),
        ...(employee.status === 'active'
          ? [
              {
                label: 'Registrar egreso',
                icon: <LogOut />,
                blockedReason: writeHint,
                onClick: () => canWrite && setTerminating(true),
              },
            ]
          : []),
        ...(canCreateAccount
          ? [
              {
                label: 'Crear cuenta de acceso',
                icon: <KeyRound />,
                blockedReason: writeHint,
                onClick: () => canWrite && setGranting(true),
              },
            ]
          : []),
        ...(!employee.hasAccount
          ? [
              {
                label: 'Eliminar',
                icon: <Trash2 />,
                tone: 'danger' as const,
                blockedReason: writeHint,
                onClick: () => canWrite && void handleDelete(),
              },
            ]
          : []),
      ]
    : [];

  return (
    <PageContainer size="md">
      <PageHeader title="Legajo" actions={headerPrimary} secondaryActions={headerSecondary} />
      {isPending ? (
        <ProfileSkeleton />
      ) : error || !employee ? (
        <ErrorState error={error} resource="El legajo" onRetry={() => void refetch()} />
      ) : (
        <>
          <PageCover
            avatar={
              <PhotoThumb
                kind={photoOwner.kind}
                id={photoOwner.id}
                url={employee.photoUrl}
                size="lg"
                fallback={<Avatar name={name} size="lg" />}
              />
            }
            title={name}
            subtitle={`${employee.position.name} · ${DOCUMENT_TYPE_LABELS[employee.documentType]} ${employee.documentNumber}`}
            badges={
              <>
                <Badge
                  label={{
                    text: EMPLOYEE_STATUS_LABELS[employee.status],
                    tone: employee.status === 'active' ? 'success' : 'neutral',
                  }}
                />
                {employee.hasAccount && <Badge label={{ text: 'Con cuenta de acceso', tone: 'info' }} />}
              </>
            }
            stats={coverStats}
          >
            <ProfileTabs tabs={tabs} value={tab} onChange={setTab} />
          </PageCover>

          <ProfileTabPanel tabKey="summary" value={tab}>
            <div className="space-y-6">
              {employee.hasAccount && (
                <p className="rounded-xl border border-outline bg-surface-hover p-3 text-sm text-muted">
                  Tiene cuenta de acceso: no se puede eliminar el legajo. Se da de baja registrando el egreso.
                </p>
              )}
              <Card className="p-6">
                <EntityPhoto
                  kind={photoOwner.kind}
                  id={photoOwner.id}
                  url={employee.photoUrl}
                  subject="del legajo"
                  canEdit={canWrite}
                  blockedReason={writeHint}
                  className="max-w-md"
                />
                {employee.hasAccount && (
                  <p className="mt-2 text-xs text-muted">Tiene cuenta de acceso: es la foto de perfil de su usuario.</p>
                )}
              </Card>
              <Card className="p-6">
                <DetailList
                  items={[
                    { label: 'Puesto', value: employee.position.name },
                    { label: 'Número de legajo', value: employee.fileNumber, mono: true },
                    {
                      label: 'Documento',
                      value: `${DOCUMENT_TYPE_LABELS[employee.documentType]} ${employee.documentNumber}`,
                      mono: true,
                    },
                    { label: 'CUIL', value: employee.cuil, mono: true },
                    { label: 'Fecha de nacimiento', value: employee.birthDate ? formatDay(employee.birthDate) : null },
                    { label: 'Teléfono', value: employee.phone },
                    { label: 'Email personal', value: employee.personalEmail },
                    {
                      label: 'Domicilio',
                      value:
                        [employee.addressLine, employee.city, employee.province, employee.postalCode]
                          .filter(Boolean)
                          .join(', ') || null,
                      wide: true,
                    },
                    {
                      label: 'Contacto de emergencia',
                      value:
                        [
                          employee.emergencyContactName,
                          employee.emergencyContactRelationship,
                          employee.emergencyContactPhone,
                        ]
                          .filter(Boolean)
                          .join(' · ') || null,
                      wide: true,
                    },
                    { label: 'Ingreso', value: formatDay(employee.hireDate) },
                    ...(employee.terminationDate
                      ? [
                          { label: 'Egreso', value: formatDay(employee.terminationDate) },
                          {
                            label: 'Motivo del egreso',
                            value: employee.terminationReason
                              ? TERMINATION_REASON_LABELS[employee.terminationReason]
                              : null,
                          },
                        ]
                      : []),
                    { label: 'Notas', value: employee.notes, wide: true },
                  ]}
                />
              </Card>
            </div>
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="documents" value={tab}>
            <EmployeeDocumentsTab employee={employee} canWrite={canWrite} blockedReason={writeHint} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="attendance" value={tab}>
            <EmployeeAttendanceTab employee={employee} canWrite={canWrite} blockedReason={writeHint} />
          </ProfileTabPanel>
          <ProfileTabPanel tabKey="leaves" value={tab}>
            <EmployeeLeavesTab employee={employee} canWrite={canWrite} blockedReason={writeHint} />
          </ProfileTabPanel>
        </>
      )}
      {employee && (
        <>
          <TerminateEmployeeModal open={terminating} onClose={() => setTerminating(false)} employee={employee} />
          <ReinstateEmployeeModal open={reinstating} onClose={() => setReinstating(false)} employee={employee} />
          <GrantAccountModal open={granting} onClose={() => setGranting(false)} employee={employee} />
        </>
      )}
    </PageContainer>
  );
};
