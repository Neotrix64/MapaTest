import React from 'react';

function ParadeModal({ children, onClose }) {
    return (
        <div className="content">

            <div className="fixed inset-0 bg-black opacity-40 z-100"></div>
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 p-10 rounded-2xl shadow-2xl w-3/4 max-w-4xl h-3/4 z-101">
            <div className="flex flex-col h-full">
                <p className='text-2xl font-bold tracking-wide p-2'>Estacion Maria Montez L2</p>
                <div className="imagen h-1/2 w-[80% ]flex items-center justify-center bg-white"></div>
                
            </div>
            <p className='text-xl font-bold'>Tiempo estimado de llegada desde tu ubicacion: 45 Mins</p>
        </div>
        </div>
    );
}

export default ParadeModal;