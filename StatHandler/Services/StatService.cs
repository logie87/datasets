using Microsoft.AspNetCore.Http;

namespace StatHandler.Services {
    public class StatService {
        public async Task<object> AnalyzeAsync(IFormFile file) {
            // 'using': like fclose() in c 
            using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream);

            // ?: can be null
            string? firstLine = await reader.ReadLineAsync();
            if (firstLine == null)
                return new { error = "empty file" };

            string[] headers = firstLine.Split(',');

            int rowCount = 0;
            double[] sums = new double[headers.Length];
            double[] mins = new double[headers.Length];
            double[] maxs = new double[headers.Length];
            int [] nullCounts = new int[headers.Length];

            for (int i = 0; i < headers.Length; i++) {
                // mins start at MaxValue - real min will always be smaller and replace
                mins[i] = double.MaxValue;
                maxs[i] = double.MinValue;
            }

            string? line;
            List<string[]> sampleRows = new List<string[]>();

            while ((line = await reader.ReadLineAsync()) != null) {
                rowCount++;
                string[] values = line.Split(',');

                for (int i = 0; i < headers.Length; i++) {
                    if (i >= values.Length || string.IsNullOrWhiteSpace(values[i])) {
                        nullCounts[i]++;
                        continue;
                    }

                    // handling mixed column type
                    if (double.TryParse(values[i], out double val)) {
                        sums[i] += val;
                        if (val < mins[i]) mins[i] = val;
                        if (val > maxs[i]) maxs[i] = val;
                    }
                }
                
                // sampling large CSV: first 3 rows then every 1000th.
                if (rowCount <= 3 || rowCount % 1000 == 0)
                    sampleRows.Add(values);
            }

            var stats = new List<object>();
            for (int i = 0; i < headers.Length; i++) {
                stats.Add(new
                {
                    column = headers[i],
                    mean = rowCount > 0 ? sums[i] / rowCount : 0,
                    // if double.min/maxValue is null: no numeric data found, could be all text or sm. allow it
                    min = mins[i] == double.MaxValue ? null : (double?)mins[i],
                    max = maxs[i] == double.MinValue ? null : (double?)maxs[i],
                    nullCount = nullCounts[i]
                });
            }

            return new {
                rowCount,
                columnCount = headers.Length,
                columns = stats,
                sample = sampleRows
            };
        }
    }
}