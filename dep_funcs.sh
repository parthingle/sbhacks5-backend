gcloud beta functions deploy handleCall --trigger-http --stage-bucket=sbhacks5bucket_stage --project=sbhacks5 --runtime nodejs8
gcloud beta functions deploy getRecording  --trigger-http --stage-bucket=sbhacks5bucket_stage --project=sbhacks5 --runtime nodejs8
gcloud beta functions deploy analyzeRecording --trigger-bucket=sbhacks5bucket --stage-bucket=sbhacks5bucket_stage --timeout=240 --runtime nodejs8 --project=sbhacks5
