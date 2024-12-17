import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOneLead } from '../../../services/api/leads';
import { Lead } from '../../../interfaces';
import { ReturnButon } from './ReturnButon';

export const LeadsDetailsView = () => {
  const { leadId } = useParams<{ leadId: string }>();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        const data = await getOneLead(leadId!);
        console.log(data);
        setLead(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadDetails();
  }, [leadId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!lead) return <div>Lead not found</div>;

  return (
    <div className="m-6 p-6 bg-white shadow rounded-lg border border-gray-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Lead Information
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Personal details and application.
          </p>
        </div>
        <div className="flex items-center">
          <ReturnButon />
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium text-gray-900">Full name</dt>
            <dd className="mt-1 text-sm text-gray-700 sm:col-span-2 sm:mt-0">
              {lead.name || 'No name available'}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium text-gray-900">
              Application for
            </dt>
            <dd className="mt-1 text-sm text-gray-700 sm:col-span-2 sm:mt-0">
              {lead.project || 'No application specified'}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium text-gray-900">Email address</dt>
            <dd className="mt-1 text-sm text-gray-700 sm:col-span-2 sm:mt-0">
              {lead.email || 'No email provided'}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium text-gray-900">Phone</dt>
            <dd className="mt-1 text-sm text-gray-700 sm:col-span-2 sm:mt-0">
              {lead.phone || 'No phone provided'}
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium text-gray-900">About</dt>
            <dd className="mt-1 text-sm text-gray-700 sm:col-span-2 sm:mt-0">
              {lead.message || 'No additional information available'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
