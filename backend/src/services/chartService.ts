import { pool } from "../db/mariadb.js";

interface ChartDataPoint {
    tagId: string;
    tagName: string;
    timestamps: number[];
    values: number[];
}

export async function getChartData(
    tagIds: string[], 
    startDate: Date, 
    endDate: Date
): Promise<ChartDataPoint[]> {
    
    try {
        if (!tagIds || tagIds.length === 0) {
            console.warn('⚠️ tagIds가 비어있습니다.');
            return [];
        }

        const placeholders = tagIds.map(() => '?').join(',');
        
        const query = `
            SELECT 
                id,
                reg_dt,
                value
            FROM trend
            WHERE id IN (${placeholders})
              AND reg_dt BETWEEN ? AND ?
            ORDER BY id, reg_dt ASC
        `;

        const params = [...tagIds, startDate, endDate];
        const [results] = await pool.query(query, params);

        const rows = results as any[];

        // 데이터 그룹화
        const groupedData: Record<string, ChartDataPoint> = {};

        rows.forEach((row: any) => {
            const tagId = row.id;
            
            if (!groupedData[tagId]) {
                groupedData[tagId] = {
                    tagId: tagId,
                    tagName: tagId,
                    timestamps: [],
                    values: []
                };
            }

            groupedData[tagId].timestamps.push(
                new Date(row.reg_dt).getTime()
            );
            groupedData[tagId].values.push(parseFloat(row.value));
        });

        const result = Object.values(groupedData);

        return result;
        
    } catch (error) {
        console.error('=' .repeat(50));
        console.error('❌ [chartService] 차트 데이터 조회 실패');
        console.error('  에러:', error);
        console.error('=' .repeat(50));
        throw error;
    }
}