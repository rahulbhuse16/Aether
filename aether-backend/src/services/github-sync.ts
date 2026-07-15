import { Project } from "../models/project";
import { User } from "../models/user";
import { formatTimeAgo } from "../utils/helper";
import axios from "axios";


export const connectGithubAccount = async (
  userId : string,
  accessToken : string
)=> {
  try {

    if (!userId || !accessToken) {
      
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      
      return;
    }

    user.githubAccessToken = accessToken;
    user.githubConnected = true;

    await user.save();

    // Fetch repositories
    const { data: repos } = await axios.get(
      "https://api.github.com/user/repos",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
        params: {
          sort: "updated",
          per_page: 100,
        },
      }
    );

    const bulkOperations = repos.map((repo: any) => ({
      updateOne: {
        filter: {
          owner: user._id,
          githubRepoId: repo.id,
        },
        update: {
          $set: {
            owner: user._id,
            githubRepoId: repo.id,
            name: repo.name,
            repo: repo.full_name,
            openTasks: repo.open_issues_count,
            lastActivity: formatTimeAgo(repo.updated_at),
            githubUpdatedAt: repo.updated_at,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOperations.length) {
      await Project.bulkWrite(bulkOperations);
    }

    const projects = await Project.find({ owner: user._id })
      .sort({ githubUpdatedAt: -1 })
      .select("name repo openTasks lastActivity");

   
  } catch (error: any) {
    console.error(error);

   
  }
};