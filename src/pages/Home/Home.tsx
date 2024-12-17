// Code: Home page component
import { Leads } from '../Leads';

export const Home = () => {
  return (
    <>
      <div className="ml-4 max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8 -mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
          {' '}
          {/* Reduje el margen inferior aún más */}
          Dashboard
        </h2>
      </div>
      <Leads />
    </>
  );
};
