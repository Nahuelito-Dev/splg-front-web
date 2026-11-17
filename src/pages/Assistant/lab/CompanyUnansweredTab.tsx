import {
  useCompanyUnanswered,
  useCreateCompanyFaqFromUnanswered,
  useDismissCompanyUnanswered,
} from '../../../services/queries/assistantLab';
import { UnansweredPanel } from './UnansweredPanel';

/** Las preguntas de los clientes que el asistente de la distribuidora no supo contestar. */
export const CompanyUnansweredTab = () => {
  const create = useCreateCompanyFaqFromUnanswered();
  const dismiss = useDismissCompanyUnanswered();
  return (
    <UnansweredPanel
      useList={useCompanyUnanswered}
      create={create}
      dismiss={dismiss}
      canManage
      audience="tus clientes"
    />
  );
};
