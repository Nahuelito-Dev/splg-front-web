import React, { useEffect, useState } from "react";
import { Stack, Box, Typography } from "@mui/material";
import { getAllUsers } from "../../../services/api/users";
import { User } from "../../../interfaces";



interface VideoTotalSentProps {
  title: string;
  subtitle: number | undefined;
  buttonHref?: string;
  large?: boolean;
}

export const VideoTotalSent = ({ title, subtitle, large }: VideoTotalSentProps) => {
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
      <div className='flex-auto p-4'>
        <div className='flex flex-wrap items-center'>
          <div className='relative w-full pr-4 max-w-full flex-grow flex-1'>
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
                xmlns='http://www.w3.org/2000/svg'
                className='h-12 w-12'
                fill='none'
                viewBox='0 0 24 24'
                stroke='#14B8A6'
                stroke-width='2'
              >
                <path
                  stroke-linecap='round'
                  stroke-linejoin='round'
                  d='M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
                />
              </svg>
            </div>
          </div>
        </div>
        <div className='text-left flex flex-row justify-start items-center'>
          <span className='mr-1'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='#14B8A6'
              stroke-width='2'
            >
              <path
                stroke-linecap='round'
                stroke-linejoin='round'
                d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
              />
            </svg>
          </span>
          <p>
            <span className='text-teal-500 font-bold'>3%</span>
          </p>
        </div>
      </div>
    </Box>
  );
};

const boxCardStyle = {
  width: 400,
  height: 130,
  borderRadius: "9px",
  background: "#FFF",
  boxShadow: "0px 1px 2px 0px #A7A7A7",
  display: "flex",
  flexGrow: 1,
  flexWrap: "wrap",
  flexDirection: "column",
  justifyContent: "space-evenly",
};
