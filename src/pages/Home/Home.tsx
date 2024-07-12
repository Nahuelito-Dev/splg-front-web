import React, { useEffect, useState } from 'react';
import { StatisticCard } from './views/StatisticCard';
import { Box, Grid } from '@mui/material';
import { FailVideoUpload } from './views/FailVideoUpload';
import { CantidadGroupCreated } from './views/CantidadGroupCreated';
import { VideoTotalSent } from './views/VideoTotalSent';

export const Home = () => {
  return (
    <div className='mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8 -mt-16'>
      <h2 className='text-2xl font-bold tracking-tight text-gray-900'>Home</h2>
      <p className='mt-2 text-lg text-gray-600'>
        Bienvenido a la página de inicio de la aplicación.
      </p>
      <div className='grid grid-cols-12 gap-4'>
        <div className='col-span-12 sm:col-span-3'>
          <StatisticCard title='Total Usuarios' subtitle={100} large />
        </div>
        <div className='col-span-12 sm:col-span-3'>
          <VideoTotalSent title='Videos Enviados' subtitle={100} large />
        </div>
        <div className='col-span-12 sm:col-span-3'>
          <CantidadGroupCreated title='Grupos Creados' subtitle={100} large />
        </div>
        <div className='col-span-12 sm:col-span-3'>
          <FailVideoUpload title='Falla en la subida de Videos' subtitle={100} large />
        </div>
      </div>
    </div>
  );
};
