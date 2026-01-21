import { supabase } from '../../../services/supabaseClient';
import { Project, projectSchema } from '../types/sprint.types';

export const projectService = {
    async listProjects(okrId?: string) {
        let query = supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (okrId) {
            query = query.eq('okr_id', okrId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Project[];
    },

    async getProject(id: string) {
        const { data, error } = await supabase
            .from('projects')
            .select('*, okr:okrs(title)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createProject(project: Partial<Project>) {
        const validated = projectSchema.parse(project);
        const { data, error } = await supabase
            .from('projects')
            .insert([validated])
            .select()
            .single();

        if (error) throw error;
        return data as Project;
    },

    async updateProject(id: string, project: Partial<Project>) {
        const { data, error } = await supabase
            .from('projects')
            .update(project)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Project;
    },

    async deleteProject(id: string) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },
};
