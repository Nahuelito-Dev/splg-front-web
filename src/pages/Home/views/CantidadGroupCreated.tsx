import React, { useEffect, useState } from "react";
import { Stack, Box, Typography } from "@mui/material";
import { getAllUsers } from "../../../services/api/users";
import { User } from "../../../interfaces";


interface   CantidadGroupCreatedProps {
  title: string;
  subtitle: number | undefined;
  buttonHref?: string;
  large?: boolean;
}

export const CantidadGroupCreated = ({ title, subtitle, large }: CantidadGroupCreatedProps) => {
  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: '9px',
        background: '#FFF',
        boxShadow: '0px 1px 2px 0px #A7A7A7',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        p: 2,
        ':hover': {
          transform: 'scale(1.05)',
          transition: 'transform 0.3s ease-in-out',
        },
        ...(large && { height: '150px' }),
      }}
      className='w-full sm:w-auto'
    >
      <div className='p-4'>
        <div className='flex flex-col sm:flex-row items-center'>
          <div className='sm:pr-4 flex-grow'>
            <h5 className='text-blueGray-400 uppercase font-bold text-sm'>
              {title}
            </h5>
            <span className='font-semibold text-2xl text-blueGray-700'>
              {subtitle}
            </span>
          </div>
          <div className='relative w-auto pl-4 flex-initial'>
            <div className='p-2 mr-3 text-blue-500 bg-blue-100 rounded-full'>
              <svg
                className='w-10 h-10'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z'></path>
              </svg>
            </div>
          </div>
        </div>
        <p className='text-sm text-blueGray-400 mt-4'>
          <span className='text-red-500 mr-2'>
            <i className='fas fa-arrow-down'></i> 1,25%{' '}
          </span>
          <span className='whitespace-nowrap'> Since yesterday </span>
        </p>
      </div>
    </Box>
  );
};
