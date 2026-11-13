import React from 'react';

// The sample restoration as an album spread: the scanned print beside its
// restored copy, both held in photo corners. Real output, not a mockup.
export const SAMPLE_BEFORE = '/showcase/before.png';
export const SAMPLE_AFTER = '/showcase/after.png';

export const PhotoSpread: React.FC<{ className?: string; small?: boolean }> = ({ className = '', small = false }) => (
  <div className={`grid grid-cols-[5fr_6fr] items-end p-2 ${small ? 'gap-5' : 'gap-[clamp(22px,4vw,52px)]'} ${className}`}>
    <figure className="min-w-0">
      <div className={`mount ${small ? 'mount-sm' : ''}`}>
        <img src={SAMPLE_BEFORE} alt="Original scan: a smiling boy in an embroidered cap, faded and soft"
          className="block w-full aspect-square object-cover" width={357} height={357} />
      </div>
      <figcaption className={`${small ? 'mt-3 text-sm' : 'mt-4 text-[15px]'} text-bone-2`}>
        <b className="block text-bone">Before</b>The print as it was scanned.
      </figcaption>
    </figure>
    <figure className="min-w-0">
      <div className={`mount ${small ? 'mount-sm' : ''}`}>
        <img src={SAMPLE_AFTER} alt="Restored: the same photo with sharp detail and natural color"
          className="block w-full aspect-square object-cover" width={1024} height={1024} />
      </div>
      <figcaption className={`${small ? 'mt-3 text-sm' : 'mt-4 text-[15px]'} text-bone-2`}>
        <b className="block text-bone">After</b>Restored in natural color.
      </figcaption>
    </figure>
  </div>
);
