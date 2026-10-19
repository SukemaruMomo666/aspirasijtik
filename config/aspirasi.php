<?php

return [
    // Configure a project-specific list with comma-separated words in ASPIRASI_BADWORDS.
    'badwords' => array_values(array_filter(array_map(
        static fn (string $word) => trim(mb_strtolower($word)),
        explode(',', env('ASPIRASI_BADWORDS', 'anjing,asu,bangsat,bajingan,brengsek,kontol,memek,ngentot'))
    ))),
];
